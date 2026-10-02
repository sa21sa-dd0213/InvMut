import { expect } from "chai";
import { ethers } from "hardhat";

describe("DAO mutant md2ff8dc9 test", function () {
  it("should detect mutant by checking finalising flag after quorum vote", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy mock VADER and VAULT contracts needed by DAO
    const MockVADER = await ethers.getContractFactory("MockVADER");
    const mockVADER = await MockVADER.deploy();
    await mockVADER.waitForDeployment();

    const MockVAULT = await ethers.getContractFactory("MockVAULT");
    const mockVAULT = await MockVAULT.deploy();
    await mockVAULT.waitForDeployment();

    const MockUSDV = await ethers.getContractFactory("MockUSDV");
    const mockUSDV = await MockUSDV.deploy();
    await mockUSDV.waitForDeployment();

    // Deploy DAO
    const DAO = await ethers.getContractFactory("DAO");
    const dao = await DAO.deploy();
    await dao.waitForDeployment();

    // Initialize DAO
    await dao.init(await mockVADER.getAddress(), await mockUSDV.getAddress(), await mockVAULT.getAddress());

    // Create a new grant proposal
    await dao.newGrantProposal(addr1.address, ethers.parseEther("100"));

    // Setup VAULT to return totalWeight = 300 so quorum (1/3) = 100
    // and getMemberWeight returns 200 for addr1 and 150 for addr2
    await mockVAULT.setTotalWeight(300);
    await mockVAULT.setMemberWeight(addr1.address, 200);
    await mockVAULT.setMemberWeight(addr2.address, 150);

    // addr1 votes on proposal 1 - this should reach quorum (200 > 100)
    await dao.connect(addr1).voteProposal(1);

    // Check that the proposal is now finalising (should be true in original)
    const isFinalising = await dao.mapPID_finalising(1);

    // In the original contract, this should be true
    // In the mutant, the condition fails and finalising remains false
    expect(isFinalising).to.equal(true);
  });
});

// Helper mock contracts
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

contract MockVAULT {
    uint public totalWeight;
    mapping(address => uint) public memberWeights;

    function setTotalWeight(uint _weight) external { totalWeight = _weight; }
    function setMemberWeight(address member, uint weight) external { memberWeights[member] = weight; }
    function getMemberWeight(address member) external view returns (uint) { return memberWeights[member]; }
    function totalWeight() external view returns (uint) { return totalWeight; }
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

contract MockUSDV {
    function balanceOf(address) external view returns (uint) { return ethers.parseEther("10000"); }
    function transfer(address, uint) external returns (bool) { return true; }
    function transferFrom(address, address, uint) external returns (bool) { return true; }
    function transferTo(address, uint) external returns (bool) { return true; }
    function approve(address, uint) external returns (bool) { return true; }
    function allowance(address, address) external view returns (uint) { return 0; }
    function totalSupply() external view returns (uint) { return 0; }
    function name() external view returns (string memory) { return "USDV"; }
    function symbol() external view returns (string memory) { return "USDV"; }
    function decimals() external view returns (uint) { return 18; }
    function burn(uint) external {}
    function burnFrom(address, uint) external {}
}