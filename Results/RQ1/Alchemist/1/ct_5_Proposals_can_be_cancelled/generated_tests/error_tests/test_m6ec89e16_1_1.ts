import { expect } from "chai";
import { ethers } from "hardhat";

describe("DAO mutant m6ec89e16 - _finalise event timestamp", function () {
  it("should emit ProposalFinalising event with correct future timestamp (block.timestamp + coolOffPeriod)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy mock VADER, USDV, and VAULT contracts (simplified interfaces)
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

    // Create a new grant proposal to trigger _finalise
    await dao.newGrantProposal(addr1.address, ethers.parseEther("100"));

    // Get the block timestamp before voting
    const blockBeforeVote = await ethers.provider.getBlock("latest");
    const timestampBeforeVote = blockBeforeVote!.timestamp;

    // Vote on the proposal (this triggers _finalise via hasQuorum logic)
    // First set up vault weights so hasQuorum returns true
    await mockVAULT.setTotalWeight(ethers.parseEther("1000"));
    await mockVAULT.setMemberWeight(owner.address, ethers.parseEther("500"));

    // Vote should trigger _finalise
    const tx = await dao.voteProposal(1);
    const receipt = await tx.wait();

    // Get the block timestamp after transaction
    const blockAfterVote = await ethers.provider.getBlock(receipt!.blockNumber);
    const timestampAfterVote = blockAfterVote!.timestamp;

    // Get the coolOffPeriod (should be 1)
    const coolOffPeriod = await dao.coolOffPeriod();

    // Find the ProposalFinalising event
    const event = receipt!.logs.find(
      (log: any) => log.topics[0] === ethers.id("ProposalFinalising(address,uint256,uint256,string)")
    );

    expect(event).to.not.be.undefined;

    // Decode the event
    const eventAbi = ["event ProposalFinalising(address indexed member, uint256 indexed proposalID, uint256 timeFinalised, string proposalType)"];
    const iface = new ethers.Interface(eventAbi);
    const decodedEvent = iface.parseLog({
      topics: event!.topics,
      data: event!.data
    });

    // The correct timeFinalised should be block.timestamp + coolOffPeriod
    // Since timestampAfterVote >= timestampBeforeVote, we check that timeFinalised is in the future
    const timeFinalised = decodedEvent!.args[2];

    // Original: block.timestamp + coolOffPeriod => future timestamp
    // Mutant: block.timestamp - coolOffPeriod => past timestamp
    // Test should pass on original (future) and fail on mutant (past)
    expect(timeFinalised).to.be.greaterThan(timestampAfterVote);
    expect(timeFinalised).to.equal(timestampAfterVote + Number(coolOffPeriod));
  });
});

// Mock contracts needed for testing
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

contract MockUSDV {
  function balanceOf(address) external pure returns (uint) { return ethers.parseEther("10000"); }
  function totalSupply() external pure returns (uint) { return 0; }
  function name() external pure returns (string memory) { return ""; }
  function symbol() external pure returns (string memory) { return ""; }
  function decimals() external pure returns (uint) { return 18; }
  function transfer(address, uint) external returns (bool) { return true; }
  function allowance(address, address) external view returns (uint) { return 0; }
  function approve(address, uint) external returns (bool) { return true; }
  function transferFrom(address, address, uint) external returns (bool) { return true; }
  function transferTo(address, uint) external returns (bool) { return true; }
  function burn(uint) external {}
  function burnFrom(address, uint) external {}
}

contract MockVAULT {
  uint public totalWeight;
  mapping(address => uint) public memberWeight;

  function setTotalWeight(uint _weight) external { totalWeight = _weight; }
  function setMemberWeight(address member, uint weight) external { memberWeight[member] = weight; }

  function getMemberWeight(address member) external view returns (uint) { return memberWeight[member]; }
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