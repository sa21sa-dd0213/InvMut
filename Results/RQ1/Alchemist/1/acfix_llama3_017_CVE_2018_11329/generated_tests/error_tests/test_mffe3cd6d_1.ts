import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherCartel mutant mffe3cd6d - calculateDrugBuy return removal", function () {
  it("should detect that calculateDrugBuy returns 0 instead of actual drug amount", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherCartel");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Seed the market to initialize the contract
    await instance.connect(owner).seedMarket(1000, { value: ethers.parseEther("10") });

    // Record initial claimedDrugs for addr1
    const initialClaimed = await instance.claimedDrugs(addr1.address);

    // Buy drugs with 1 ether
    const buyAmount = ethers.parseEther("1");
    const tx = await instance.connect(addr1).buyDrugs({ value: buyAmount });
    await tx.wait();

    // Get claimedDrugs after purchase
    const finalClaimed = await instance.claimedDrugs(addr1.address);
    const drugsAdded = finalClaimed - initialClaimed;

    // In the original contract, drugsAdded should be > 0
    // In the mutant (no return), drugsAdded will be 0
    expect(drugsAdded).to.be.gt(0);
  });
});