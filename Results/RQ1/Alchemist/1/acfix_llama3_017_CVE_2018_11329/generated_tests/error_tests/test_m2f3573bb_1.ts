import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherCartel mutant m2f3573bb detection test", function () {
  it("should detect the mutant by verifying referral cannot be overwritten", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherCartel");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Seed the market to initialize the contract
    await instance.connect(owner).seedMarket(1000, { value: ethers.parseEther("10") });

    // Get free kilos for addr1 so they have some production capacity
    await instance.connect(addr1).getFreeKilo();

    // First call: addr1 collects drugs with addr2 as referral
    await instance.connect(addr1).collectDrugs(addr2.address);

    // Check that referral is set to addr2
    expect(await instance.referrals(addr1.address)).to.equal(addr2.address);

    // Second call: addr1 tries to collect drugs with a different referral (owner)
    await instance.connect(addr1).collectDrugs(owner.address);

    // Verify that referral is STILL addr2 (not overwritten to owner)
    // In the original contract with &&, the referral should remain addr2
    // In the mutant with ||, the referral would be overwritten to owner
    expect(await instance.referrals(addr1.address)).to.equal(addr2.address);
  });
});