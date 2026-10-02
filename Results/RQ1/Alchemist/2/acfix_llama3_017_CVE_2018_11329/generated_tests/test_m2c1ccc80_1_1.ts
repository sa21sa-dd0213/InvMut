import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherCartel mutant m2c1ccc80 - collectDrugs referral logic", function () {
  it("should set referral for first-time caller but mutant fails to do so", async function () {
    const [owner, user, referrer] = await ethers.getSigners();

    // Deploy contract (no constructor arguments needed for this contract)
    const Factory = await ethers.getContractFactory("EtherCartel");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Seed the market to initialize the contract
    const seedAmount = ethers.parseEther("1");
    await instance.connect(owner).seedMarket(1000, { value: seedAmount });

    // Give user some drugs by buying them
    const buyAmount = ethers.parseEther("0.1");
    await instance.connect(user).buyDrugs({ value: buyAmount });

    // User calls collectDrugs with referrer address
    await instance.connect(user).collectDrugs(referrer.address);

    // Check that the referral was set to the referrer address
    const userReferral = await instance.referrals(user.address);
    expect(userReferral).to.equal(referrer.address);
  });
});