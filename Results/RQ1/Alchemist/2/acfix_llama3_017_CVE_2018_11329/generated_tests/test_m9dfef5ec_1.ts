import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherCartel mutant m9dfef5ec - getFreeKilo timestamp replacement", function () {
  it("should kill the mutant by verifying getDrugsSinceLastCollect returns 0 immediately after getFreeKilo", async function () {
    const [owner, user] = await ethers.getSigners();
    
    const Factory = await ethers.getContractFactory("EtherCartel");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Seed the market to initialize the contract
    const seedDrugs = ethers.parseEther("100");
    await instance.connect(owner).seedMarket(seedDrugs, { value: ethers.parseEther("1") });
    
    // User calls getFreeKilo
    await instance.connect(user).getFreeKilo();
    
    // Immediately check drugsSinceLastCollect - should be 0 because no time has elapsed
    // In the original: lastCollect = block.timestamp, so secondsPassed = 0
    // In the mutant: lastCollect = block.prevrandao, so secondsPassed will NOT be 0
    const drugsSinceLastCollect = await instance.connect(user).getDrugsSinceLastCollect(user.address);
    
    expect(drugsSinceLastCollect).to.equal(0);
  });
});