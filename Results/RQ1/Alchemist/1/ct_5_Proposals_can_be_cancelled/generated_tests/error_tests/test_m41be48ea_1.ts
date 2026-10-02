import { expect } from "chai";
import { ethers } from "hardhat";

describe("DAO mutant test - m41be48ea", function () {
  it("should emit ProposalFinalising with block.timestamp + coolOffPeriod (not multiplication)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy mock VADER
    const VADERFactory = await ethers.getContractFactory("VADERMock");
    const vader = await VADERFactory.deploy();
    await vader.waitForDeployment();
    
    // Deploy mock VAULT
    const VAULTFactory = await ethers.getContractFactory("VAULTMock");
    const vault = await VAULTFactory.deploy();
    await vault.waitForDeployment();
    
    // Deploy mock USDV
    const USDVFactory = await ethers.getContractFactory("USDVMock");
    const usdv = await USDVFactory.deploy();
    await usdv.waitForDeployment();
    
    // Deploy DAO
    const DAOFactory = await ethers.getContractFactory("DAO");
    const dao = await DAOFactory.deploy();
    await dao.waitForDeployment();
    
    // Initialize DAO
    await dao.init(await vader.getAddress(), await usdv.getAddress(), await vault.getAddress());
    
    // Create a grant proposal to trigger _finalise
    await dao.newGrantProposal(addr1.address, ethers.parseEther("100"));
    
    // Get block timestamp before voting
    const blockBefore = await ethers.provider.getBlock("latest");
    const coolOffPeriod = await dao.coolOffPeriod();
    
    // Vote on proposal 1 - this will trigger _finalise
    const tx = await dao.connect(addr2).voteProposal(1);
    const receipt = await tx.wait();
    
    // Find ProposalFinalising event
    const event = receipt.logs.find(
      (log) => {
        try {
          const parsed = dao.interface.parseLog({
            topics: [...log.topics],
            data: log.data
          });
          return parsed?.name === "ProposalFinalising";
        } catch {
          return false;
        }
      }
    );
    
    // Parse the event
    const parsedEvent = dao.interface.parseLog({
      topics: [...event.topics],
      data: event.data
    });
    
    // Get the timeFinalised value from the event
    const timeFinalised = parsedEvent.args[2];
    
    // Expected: block.timestamp + coolOffPeriod (addition)
    const expectedTime = BigInt(blockBefore.timestamp) + coolOffPeriod;
    
    // Assert that the event emitted the correct time (addition, not multiplication)
    expect(timeFinalised).to.equal(expectedTime);
    
    // Additional check: verify it's NOT the multiplication result
    const wrongTime = BigInt(blockBefore.timestamp) * coolOffPeriod;
    expect(timeFinalised).to.not.equal(wrongTime);
  });
});