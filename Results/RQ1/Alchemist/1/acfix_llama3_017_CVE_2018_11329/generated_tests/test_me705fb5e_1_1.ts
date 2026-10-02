import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherCartel mutant me705fb5e - collectDrugs referral assignment", function () {
  it("should kill mutant by verifying referral is set after collectDrugs call", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy contract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("EtherCartel");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Seed the market to initialize the contract
    const seedDrugs = ethers.parseEther("100");
    await instance.connect(owner).seedMarket(seedDrugs, { value: ethers.parseEther("1") });

    // Get free kilos for addr1 so they have kilos to produce drugs
    await instance.connect(addr1).getFreeKilo();

    // Wait some time so drugs accumulate
    await ethers.provider.send("evm_increaseTime", [86400]); // 1 day
    await ethers.provider.send("evm_mine", []);

    // addr1 calls collectDrugs with addr2 as referral
    await instance.connect(addr1).collectDrugs(addr2.address);

    // Check if referral was set - in original it should be addr2, in mutant it stays address(0)
    const referral = await instance.referrals(addr1.address);

    // This assertion will pass on original (referral == addr2) but fail on mutant (referral == address(0))
    expect(referral).to.equal(addr2.address);
  });
});