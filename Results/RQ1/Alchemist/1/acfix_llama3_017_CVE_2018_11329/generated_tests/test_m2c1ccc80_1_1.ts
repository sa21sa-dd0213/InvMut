import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherCartel mutant detection - m2c1ccc80", function () {
  it("should set referral for new user in original but not in mutant", async function () {
    const [owner, user, referrer] = await ethers.getSigners();

    // Deploy contract
    const Factory = await ethers.getContractFactory("EtherCartel");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Seed the market first (required to initialize)
    await instance.seedMarket(1000, { value: ethers.parseEther("10") });

    // Give user some starting kilos so they can collect drugs
    await instance.connect(user).getFreeKilo();

    // User calls collectDrugs with referrer address
    await instance.connect(user).collectDrugs(referrer.address);

    // Check if referral was set - in original it should be referrer,
    // in mutant it will remain address(0) because condition fails for new users
    const storedReferral = await instance.referrals(user.address);

    // This assertion will pass on original (referral set) but fail on mutant (referral is address(0))
    expect(storedReferral).to.equal(referrer.address);
  });
});