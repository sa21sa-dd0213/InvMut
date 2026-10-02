import { expect } from "chai";
import { ethers } from "hardhat";

describe("DAO mutant m1c566446 - grantFunds division to addition", function () {
  it("should revert when grant amount exceeds 10% of vault balance, but mutant allows it", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy mock ERC20 tokens for VADER and USDV
    const ERC20Factory = await ethers.getContractFactory("MockERC20");
    const vaderToken = await ERC20Factory.deploy("VADER", "VADER", 18);
    const usdvToken = await ERC20Factory.deploy("USDV", "USDV", 18);
    await vaderToken.waitForDeployment();
    await usdvToken.waitForDeployment();
    
    // Deploy mock VADER contract
    const VADERFactory = await ethers.getContractFactory("MockVADER");
    const vaderMock = await VADERFactory.deploy();
    await vaderMock.waitForDeployment();
    
    // Deploy mock VAULT contract
    const VAULTFactory = await ethers.getContractFactory("MockVAULT");
    const vaultMock = await VAULTFactory.deploy();
    await vaultMock.waitForDeployment();
    
    // Deploy DAO
    const DAOFactory = await ethers.getContractFactory("DAO");
    const dao = await DAOFactory.deploy();
    await dao.waitForDeployment();
    
    // Initialize DAO
    await dao.init(await vaderMock.getAddress(), await usdvToken.getAddress(), await vaultMock.getAddress());
    
    // Setup: Give vault some USDV balance
    const vaultAddress = await vaultMock.getAddress();
    await usdvToken.transfer(vaultAddress, ethers.parseEther("1000"));
    
    // Setup: Set totalWeight for vault mock to allow voting
    await vaultMock.setTotalWeight(ethers.parseEther("100"));
    
    // Create a grant proposal with amount = 20% of vault balance (200 tokens)
    const grantAmount = ethers.parseEther("200"); // 20% of 1000
    await dao.connect(addr1).newGrantProposal(addr2.address, grantAmount);
    const proposalId = 1;
    
    // Vote on the proposal to make it finalising
    await dao.connect(addr1).voteProposal(proposalId);
    
    // Simulate time passing beyond coolOffPeriod (coolOffPeriod = 1 second)
    await ethers.provider.send("evm_increaseTime", [2]);
    await ethers.provider.send("evm_mine", []);
    
    // Attempt to finalise the proposal
    // Original should revert because 200 > 1000/10 = 100
    // Mutant would allow because 200 <= 1000 + 10 = 1010
    await expect(
      dao.connect(addr1).finaliseProposal(proposalId)
    ).to.be.revertedWith("Not more than 10%");
  });
});