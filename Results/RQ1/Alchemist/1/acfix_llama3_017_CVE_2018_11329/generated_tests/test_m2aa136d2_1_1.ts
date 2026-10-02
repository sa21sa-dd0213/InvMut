import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherCartel mutant m2aa136d2", function () {
  it("should not allow overwriting referral after it has been set", async function () {
    const [owner, addr1, addr2, addr3] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherCartel");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Seed the market first to initialize
    await instance.seedMarket(1000, { value: ethers.parseEther("1") });

    // Get free kilos for addr1 so they have some kilos to produce drugs
    await instance.connect(addr1).getFreeKilo();

    // Wait some time so addr1 accumulates some drugs
    await ethers.provider.send("evm_increaseTime", [86400]); // 1 day
    await ethers.provider.send("evm_mine");

    // First collect with addr2 as referral
    await instance.connect(addr1).collectDrugs(addr2.address);

    // Get the referral set for addr1
    const referralAfterFirst = await instance.referrals(addr1.address);
    expect(referralAfterFirst).to.equal(addr2.address);

    // Second collect with addr3 as referral - this should NOT overwrite the existing referral
    await instance.connect(addr1).collectDrugs(addr3.address);

    // Check that the referral is still addr2, not addr3
    const referralAfterSecond = await instance.referrals(addr1.address);
    expect(referralAfterSecond).to.equal(addr2.address);
    expect(referralAfterSecond).to.not.equal(addr3.address);
  });
});