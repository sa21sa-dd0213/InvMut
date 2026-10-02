import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherCartel mutant m2ff91fa9", function () {
  it("should kill mutant by checking exact drugs received for a specific msg.value", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherCartel");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Seed the market first
    await instance.seedMarket(1000, { value: ethers.parseEther("10") });

    // Calculate expected drugs for sending exactly 1 ether using original logic
    const ethAmount = ethers.parseEther("1");
    const contractBalanceBefore = await ethers.provider.getBalance(instance.target);
    
    // Expected calculation: calculateDrugBuy(msg.value, contractBalanceBefore)
    const expectedDrugs = await instance.calculateDrugBuy(ethAmount, contractBalanceBefore);
    const devFee = await instance.devFee(expectedDrugs);
    const expectedNetDrugs = expectedDrugs - devFee;

    // Execute buyDrugs with exactly 1 ether
    await instance.connect(addr1).buyDrugs({ value: ethAmount });

    // Check claimedDrugs for addr1 - mutant will produce different value
    const actualDrugs = await instance.claimedDrugs(addr1.address);
    expect(actualDrugs).to.equal(expectedNetDrugs);
  });
});