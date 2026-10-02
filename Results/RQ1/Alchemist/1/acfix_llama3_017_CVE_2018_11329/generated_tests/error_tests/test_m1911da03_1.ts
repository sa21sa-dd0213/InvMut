import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherCartel mutant m1911da03 - collectDrugs referral setting", function () {
  it("should revert or fail to set referral when using the mutant that changes != to >=", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherCartel");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Seed the market to initialize the contract
    const seedDrugs = ethers.parseEther("100");
    await instance.connect(owner).seedMarket(seedDrugs, { value: ethers.parseEther("10") });

    // Get free kilos for addr1 so they have production capacity
    await instance.connect(addr1).getFreeKilo();

    // Call collectDrugs with addr2 as referral
    await instance.connect(addr1).collectDrugs(addr2.address);

    // Check the referral mapping - in original it should be addr2, in mutant it stays address(0)
    const referral = await instance.referrals(addr1.address);
    expect(referral).to.equal(addr2.address);
  });
});