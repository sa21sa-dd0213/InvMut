import { expect } from "chai";
import { ethers } from "hardhat";

describe("DAO mutant m84bdfa8e - moveRewardAddress zero address check", function () {
  it("should revert when trying to finalise a proposal that sets reward address to address(0)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy mock contracts for VADER, USDV, VAULT
    const MockVADER = await ethers.getContractFactory("MockVADER");
    const mockVADER = await MockVADER.deploy();
    await mockVADER.waitForDeployment();
    
    const MockUSDV = await ethers.getContractFactory("MockERC20");
    const mockUSDV = await MockUSDV.deploy("USDV", "USDV", 18);
    await mockUSDV.waitForDeployment();
    
    const MockVAULT = await ethers.getContractFactory("MockVAULT");
    const mockVAULT = await MockVAULT.deploy();
    await mockVAULT.waitForDeployment();
    
    // Deploy DAO
    const Factory = await ethers.getContractFactory("DAO");
    const dao = await Factory.deploy();
    await dao.waitForDeployment();
    
    // Initialize DAO
    await dao.init(await mockVADER.getAddress(), await mockUSDV.getAddress(), await mockVAULT.getAddress());
    
    // Create a proposal to set reward address to address(0)
    await dao.newAddressProposal(ethers.ZeroAddress, "REWARD");
    
    // Get the proposal ID (should be 1)
    const proposalId = 1;
    
    // Vote on the proposal to get quorum and majority
    // We need to set up mock VAULT to return proper weights
    await mockVAULT.setTotalWeight(1000);
    await mockVAULT.setMemberWeight(owner.address, 600);
    
    // Vote (this should trigger finalising since quorum and majority are met for REWARD type)
    await dao.voteProposal(proposalId);
    
    // Set coolOffPeriod to 1 (already set in init)
    // Advance time past coolOffPeriod
    await ethers.provider.send("evm_increaseTime", [2]);
    await ethers.provider.send("evm_mine", []);
    
    // Try to finalise the proposal - should revert because address(0) is not allowed
    await expect(dao.finaliseProposal(proposalId)).to.be.revertedWith("No address proposed");
  });
});

// Helper mock contracts for testing
contract MockVADER {
    address public UTILS;
    address public DAO;
    bool public emitting;
    bool public minting;
    uint public secondsPerEra;
    address public rewardAddress;
    
    function setRewardAddress(address newAddress) external {
        rewardAddress = newAddress;
    }
    
    function changeUTILS(address newUTILS) external {
        UTILS = newUTILS;
    }
    
    function flipEmissions() external {}
    function flipMinting() external {}
    function setParams(uint, uint) external {}
    function changeDAO(address) external {}
    function purgeDAO() external {}
    function upgrade(uint) external {}
    function redeem() external returns (uint) { return 0; }
    function redeemToMember(address) external returns (uint) { return 0; }
}

contract MockERC20 {
    string public name;
    string public symbol;
    uint public decimals;
    uint public totalSupply;
    mapping(address => uint) public balanceOf;
    mapping(address => mapping(address => uint)) public allowance;
    
    constructor(string memory _name, string memory _symbol, uint _decimals) {
        name = _name;
        symbol = _symbol;
        decimals = _decimals;
    }
    
    function transfer(address, uint) external returns (bool) { return true; }
    function approve(address, uint) external returns (bool) { return true; }
    function transferFrom(address, address, uint) external returns (bool) { return true; }
    function transferTo(address, uint) external returns (bool) { return true; }
    function burn(uint) external {}
    function burnFrom(address, uint) external {}
}

contract MockVAULT {
    uint public totalWeight;
    mapping(address => uint) public memberWeight;
    uint public reserveUSDV;
    uint public reserveVADER;
    
    function setTotalWeight(uint _weight) external { totalWeight = _weight; }
    function setMemberWeight(address member, uint weight) external { memberWeight[member] = weight; }
    
    function getMemberWeight(address member) external view returns (uint) { return memberWeight[member]; }
    function getMemberDeposit(address, address) external view returns (uint) { return 0; }
    function getMemberLastTime(address, address) external view returns (uint) { return 0; }
    
    function setParams(uint, uint, uint) external {}
    function grant(address, uint) external {}
    function deposit(address, uint) external {}
    function depositForMember(address, address, uint) external {}
    function harvest(address) external returns (uint) { return 0; }
    function calcCurrentReward(address, address) external view returns (uint) { return 0; }
    function calcReward(address, address) external view returns (uint) { return 0; }
    function withdraw(address, uint) external returns (uint) { return 0; }
}