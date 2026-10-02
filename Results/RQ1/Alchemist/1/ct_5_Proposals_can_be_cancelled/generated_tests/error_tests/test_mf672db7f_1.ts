import { expect } from "chai";
import { ethers } from "hardhat";

describe("DAO mutant test for mf672db7f", function () {
  it("should NOT finalise a DAO type proposal without majority, but the mutant would", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy mock VADER, mock USDV, and mock VAULT contracts first
    const MockVADER = await ethers.getContractFactory("MockVADER");
    const mockVADER = await MockVADER.deploy();
    await mockVADER.waitForDeployment();

    const MockUSDV = await ethers.getContractFactory("MockUSDV");
    const mockUSDV = await MockUSDV.deploy();
    await mockUSDV.waitForDeployment();

    const MockVAULT = await ethers.getContractFactory("MockVAULT");
    const mockVAULT = await MockVAULT.deploy();
    await mockVAULT.waitForDeployment();

    // Deploy DAO
    const Factory = await ethers.getContractFactory("DAO");
    const dao = await Factory.deploy();
    await dao.waitForDeployment();

    // Initialize DAO with mock addresses
    await dao.init(await mockVADER.getAddress(), await mockUSDV.getAddress(), await mockVAULT.getAddress());

    // Create a DAO type proposal (address proposal with type "DAO")
    await dao.newAddressProposal(addr1.address, "DAO");

    // Get total weight from vault (mock returns 100)
    const totalWeight = await mockVAULT.totalWeight();
    
    // Set member weight for addr1 to be > quorum (33%) but < majority (50%)
    // Quorum = 100/3 = 33, Majority = 100/2 = 50
    // Set weight to 40 (between 33 and 50)
    await mockVAULT.setMemberWeight(addr1.address, 40);

    // Vote on proposal 1 as addr1
    await dao.connect(addr1).voteProposal(1);

    // Check if proposal was finalised - it should NOT be because we have quorum but not majority
    const isFinalising = await dao.mapPID_finalising(1);
    
    // In the original contract, this should be false (not finalised)
    // In the mutant, the DAO type check is broken and it would finalise
    expect(isFinalising).to.equal(false, "Proposal should not be finalised without majority");
  });
});

// Helper mock contracts for testing
// MockVADER
contract MockVADER {
    function UTILS() external view returns (address) { return address(0); }
    function DAO() external view returns (address) { return address(0); }
    function emitting() external view returns (bool) { return false; }
    function minting() external view returns (bool) { return false; }
    function secondsPerEra() external view returns (uint) { return 0; }
    function flipEmissions() external {}
    function flipMinting() external {}
    function setParams(uint, uint) external {}
    function setRewardAddress(address) external {}
    function changeUTILS(address) external {}
    function changeDAO(address) external {}
    function purgeDAO() external {}
    function upgrade(uint) external {}
    function redeem() external returns (uint) { return 0; }
    function redeemToMember(address) external returns (uint) { return 0; }
}

// MockUSDV
contract MockUSDV {
    function balanceOf(address) external view returns (uint) { return 1000 ether; }
    function name() external view returns (string memory) { return ""; }
    function symbol() external view returns (string memory) { return ""; }
    function decimals() external view returns (uint) { return 18; }
    function totalSupply() external view returns (uint) { return 0; }
    function transfer(address, uint) external returns (bool) { return true; }
    function allowance(address, address) external view returns (uint) { return 0; }
    function approve(address, uint) external returns (bool) { return true; }
    function transferFrom(address, address, uint) external returns (bool) { return true; }
    function transferTo(address, uint) external returns (bool) { return true; }
    function burn(uint) external {}
    function burnFrom(address, uint) external {}
}

// MockVAULT
contract MockVAULT {
    mapping(address => uint) public memberWeights;
    uint public totalWeightValue = 100;
    
    function setMemberWeight(address member, uint weight) external {
        memberWeights[member] = weight;
    }
    
    function getMemberWeight(address member) external view returns (uint) {
        return memberWeights[member];
    }
    
    function totalWeight() external view returns (uint) {
        return totalWeightValue;
    }
    
    function setParams(uint, uint, uint) external {}
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
}