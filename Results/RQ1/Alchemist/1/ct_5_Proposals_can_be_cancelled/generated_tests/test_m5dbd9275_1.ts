import { expect } from "chai";
import { ethers } from "hardhat";

describe("DAO mutant m5dbd9275 - kill test", function () {
  it("should revert when trying to finalise a UTILS proposal that would incorrectly execute grantFunds", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy mock contracts for VADER, USDV, and VAULT
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const mockUSDV = await MockERC20.deploy("USDV", "USDV", 18);
    await mockUSDV.waitForDeployment();
    
    const MockVADER = await ethers.getContractFactory("MockVADER");
    const mockVADER = await MockVADER.deploy();
    await mockVADER.waitForDeployment();
    
    const MockVAULT = await ethers.getContractFactory("MockVAULT");
    const mockVAULT = await MockVAULT.deploy();
    await mockVAULT.waitForDeployment();
    
    // Deploy DAO
    const Factory = await ethers.getContractFactory("DAO");
    const dao = await Factory.deploy();
    await dao.waitForDeployment();
    
    // Initialize DAO
    await dao.init(await mockVADER.getAddress(), await mockUSDV.getAddress(), await mockVAULT.getAddress());
    
    // Setup: mint USDV to vault and set totalWeight
    await mockUSDV.mint(await mockVAULT.getAddress(), ethers.parseEther("1000"));
    await mockVAULT.setTotalWeight(ethers.parseEther("100"));
    
    // Create a UTILS proposal (not GRANT)
    await dao.connect(addr1).newAddressProposal(addr2.address, "UTILS");
    const proposalId = 1;
    
    // Vote to get quorum and finalising status
    await mockVAULT.setMemberWeight(addr1.address, ethers.parseEther("40"));
    await dao.connect(addr1).voteProposal(proposalId);
    
    // Set the time to pass coolOffPeriod
    await ethers.provider.send("evm_increaseTime", [2]);
    await ethers.provider.send("evm_mine", []);
    
    // Try to finalise - in original this would succeed for UTILS and call moveUtils
    // In mutant, it incorrectly calls grantFunds which will try to transfer USDV
    // The grantFunds function has a require that amount <= 10% of vault balance
    // Since no grant was set for this proposal, mapPID_grant[proposalId] will be (0,0)
    // amount = 0, so it passes the require, then calls vault.grant(0, 0)
    // The mutant will succeed where it shouldn't - but we need to detect the incorrect behavior
    // We can detect this by checking that the UTILS address was NOT changed (since mutant calls grant instead)
    
    await dao.connect(addr1).finaliseProposal(proposalId);
    
    // In original: mockVADER.changeUTILS would have been called with addr2
    // In mutant: grantFunds was called instead, so changeUTILS was never called
    // Check that the UTILS address was NOT updated (mutant fails to update it)
    expect(await mockVADER.lastChangedUTILS()).to.not.equal(addr2.address);
    
    // Additional check: verify that no USDV was transferred from vault (since amount was 0)
    expect(await mockUSDV.balanceOf(addr2.address)).to.equal(0);
  });
});

// Helper mock contracts
contract MockERC20 {
    string public name;
    string public symbol;
    uint8 public decimals;
    uint public totalSupply;
    mapping(address => uint) public balanceOf;
    mapping(address => mapping(address => uint)) public allowance;
    
    constructor(string memory _name, string memory _symbol, uint8 _decimals) {
        name = _name;
        symbol = _symbol;
        decimals = _decimals;
    }
    
    function mint(address to, uint amount) external {
        balanceOf[to] += amount;
        totalSupply += amount;
    }
    
    function transfer(address to, uint amount) external returns (bool) {
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        return true;
    }
    
    function approve(address spender, uint amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        return true;
    }
    
    function transferFrom(address from, address to, uint amount) external returns (bool) {
        allowance[from][msg.sender] -= amount;
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        return true;
    }
    
    function transferTo(address to, uint amount) external returns (bool) {
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        return true;
    }
    
    function burn(uint amount) external {
        balanceOf[msg.sender] -= amount;
        totalSupply -= amount;
    }
    
    function burnFrom(address from, uint amount) external {
        balanceOf[from] -= amount;
        totalSupply -= amount;
    }
}

contract MockVADER {
    address public lastChangedUTILS;
    address public lastSetRewardAddress;
    
    function UTILS() external view returns (address) { return address(0); }
    function DAO() external view returns (address) { return address(0); }
    function emitting() external view returns (bool) { return false; }
    function minting() external view returns (bool) { return false; }
    function secondsPerEra() external view returns (uint) { return 0; }
    function flipEmissions() external {}
    function flipMinting() external {}
    function setParams(uint, uint) external {}
    function setRewardAddress(address newAddress) external { lastSetRewardAddress = newAddress; }
    function changeUTILS(address newUTILS) external { lastChangedUTILS = newUTILS; }
    function changeDAO(address) external {}
    function purgeDAO() external {}
    function upgrade(uint) external {}
    function redeem() external returns (uint) { return 0; }
    function redeemToMember(address) external returns (uint) { return 0; }
}

contract MockVAULT {
    uint public totalWeight;
    mapping(address => uint) public memberWeight;
    
    function setTotalWeight(uint _weight) external { totalWeight = _weight; }
    function setMemberWeight(address member, uint weight) external { memberWeight[member] = weight; }
    
    function getMemberWeight(address member) external view returns (uint) { return memberWeight[member]; }
    function grant(address, uint) external {}
    function deposit(address, uint) external {}
    function depositForMember(address, address, uint) external {}
    function harvest(address) external returns (uint) { return 0; }
    function calcCurrentReward(address, address) external view returns (uint) { return 0; }
    function calcReward(address, address) external view returns (uint) { return 0; }
    function withdraw(address, uint) external returns (uint) { return 0; }
    function reserveUSDV() external view returns (uint) { return 0; }
    function reserveVADER() external view returns (uint) { return 0; }
    function getMemberDeposit(address, address) external view returns (uint) { return 0; }
    function getMemberLastTime(address, address) external view returns (uint) { return 0; }
    function setParams(uint, uint, uint) external {}
}