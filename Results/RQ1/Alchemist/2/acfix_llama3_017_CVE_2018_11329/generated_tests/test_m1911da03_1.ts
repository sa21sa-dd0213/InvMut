import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherCartel - Mutant m1911da03", function () {
  it("should kill mutant by verifying referral assignment in collectDrugs", async function () {
    const [owner, user, referrer] = await ethers.getSigners();
    
    // Deploy contract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("EtherCartel");
    const contract = await Factory.deploy();
    await contract.waitForDeployment();
    
    // Seed the market to initialize the contract
    const seedAmount = ethers.parseEther("1");
    await contract.connect(owner).seedMarket(1000, { value: seedAmount });
    
    // Verify contract is initialized
    expect(await contract.initialized()).to.be.true;
    
    // User calls collectDrugs with a referral address
    await contract.connect(user).collectDrugs(referrer.address);
    
    // Check that the referral was properly assigned
    // In the original contract, this should be referrer.address
    // In the mutant, the condition always fails so referral remains address(0)
    const storedReferral = await contract.referrals(user.address);
    expect(storedReferral).to.equal(referrer.address);
  });
});