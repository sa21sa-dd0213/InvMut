import { expect } from "chai";
import { ethers } from "hardhat";

describe("DAO mutant test - grantFunds exact equality", function () {
  let dao: any;
  let vaderMock: any;
  let usdvMock: any;
  let vaultMock: any;
  let owner: any;
  let member1: any;
  let recipient: any;

  beforeEach(async function () {
    [owner, member1, recipient] = await ethers.getSigners();

    // Deploy mock contracts for VADER, USDV, and VAULT
    const VADERMock = await ethers.getContractFactory("VADERMock");
    vaderMock = await VADERMock.deploy();
    await vaderMock.waitForDeployment();

    const USDVMock = await ethers.getContractFactory("USDVMock");
    usdvMock = await USDVMock.deploy();
    await usdvMock.waitForDeployment();

    const VAULTMock = await ethers.getContractFactory("VAULTMock");
    vaultMock = await VAULTMock.deploy();
    await vaultMock.waitForDeployment();

    // Deploy DAO with constructor arguments (none required)
    const DAOFactory = await ethers.getContractFactory("DAO");
    dao = await DAOFactory.deploy();
    await dao.waitForDeployment();

    // Initialize DAO with mock addresses
    await dao.init(
      await vaderMock.getAddress(),
      await usdvMock.getAddress(),
      await vaultMock.getAddress()
    );

    // Setup vault mock to return a total weight for quorum calculations
    await vaultMock.setTotalWeight(ethers.parseEther("1000"));

    // Setup USDV balance in vault to 1000 USDV
    await usdvMock.setBalanceOf(await vaultMock.getAddress(), ethers.parseEther("1000"));

    // Give member1 some voting weight
    await vaultMock.setMemberWeight(member1.address, ethers.parseEther("500"));
  });

  it("should kill mutant by creating a grant with amount less than 10% of vault balance", async function () {
    // Create a grant proposal with amount = 5% of vault balance (50 USDV)
    // This is strictly less than 10% (100 USDV)
    const grantAmount = ethers.parseEther("50");
    
    await dao.connect(member1).newGrantProposal(recipient.address, grantAmount);
    const proposalId = 1;

    // Vote on the proposal to reach quorum and majority
    await dao.connect(member1).voteProposal(proposalId);

    // Advance time past coolOffPeriod (1 second)
    await ethers.provider.send("evm_increaseTime", [2]);
    await ethers.provider.send("evm_mine", []);

    // In original contract: require(_grant.amount <= iERC20(USDV).balanceOf(VAULT) / 10)
    // balanceOf(VAULT) = 1000 USDV, so 10% = 100 USDV
    // Our amount is 50 USDV, which satisfies 50 <= 100 (original)
    // But mutant changes to ==, so 50 == 100 will FAIL
    
    // This should revert in the mutant but pass in original
    await expect(
      dao.connect(member1).finaliseProposal(proposalId)
    ).to.be.revertedWith("Not more than 10%");
  });
});

// Mock contracts needed for testing
contract VADERMock {
  function changeUTILS(address) external pure {}
  function setRewardAddress(address) external pure {}
}

contract USDVMock {
  mapping(address => uint) public balances;
  
  function setBalanceOf(address account, uint amount) external {
    balances[account] = amount;
  }
  
  function balanceOf(address account) external view returns (uint) {
    return balances[account];
  }
}

contract VAULTMock {
  uint public totalWeight;
  mapping(address => uint) public memberWeights;
  
  function setTotalWeight(uint _weight) external {
    totalWeight = _weight;
  }
  
  function setMemberWeight(address member, uint weight) external {
    memberWeights[member] = weight;
  }
  
  function getMemberWeight(address member) external view returns (uint) {
    return memberWeights[member];
  }
  
  function totalWeight() external view returns (uint) {
    return totalWeight;
  }
  
  function grant(address, uint) external pure {}
}