import { expect } from "chai";
import { ethers } } from "hardhat";

describe("EtherCartel - Mutant m2ff91fa9", function () {
  it("should detect mutant by comparing expected drugsBought from calculateDrugBuy with actual claimedDrugs after buyDrugs", async function () {
    const [owner, user] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherCartel");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Seed the market first
    const seedAmount = ethers.parseEther("10");
    const seedDrugs = ethers.parseEther("1000");
    await instance.connect(owner).seedMarket(seedDrugs, { value: seedAmount });

    // Now user buys drugs with a specific ETH amount
    const buyAmount = ethers.parseEther("1");
    
    // Get expected drugs bought using the original calculateDrugBuy logic
    const contractBalanceBefore = await ethers.provider.getBalance(instance.target);
    const expectedDrugs = await instance.calculateDrugBuy(buyAmount, contractBalanceBefore);
    const fee = await instance.devFee(expectedDrugs);
    const expectedNetDrugs = expectedDrugs - fee;

    // Execute buyDrugs
    const tx = await instance.connect(user).buyDrugs({ value: buyAmount });
    await tx.wait();

    // Check claimedDrugs for the user
    const actualClaimedDrugs = await instance.claimedDrugs(user.address);
    
    // On original: actualClaimedDrugs should equal expectedNetDrugs
    // On mutant: actualClaimedDrugs will differ because calculateDrugBuy receives wrong contractBalance
    expect(actualClaimedDrugs).to.equal(expectedNetDrugs);
  });
});