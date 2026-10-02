import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherCartel - kill mutant m0c7d52a9 (self-referral guard)", function () {
  it("should revert when a user tries to refer themselves in collectDrugs", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy contract
    const Factory = await ethers.getContractFactory("EtherCartel");
    const contract = await Factory.deploy();
    await contract.waitForDeployment();

    // Seed the market to initialize the contract
    // First send some ETH to the contract so seedMarket can work
    await owner.sendTransaction({
      to: await contract.getAddress(),
      value: ethers.parseEther("1")
    });

    // Call seedMarket to initialize
    await contract.seedMarket(1000);

    // Give addr1 some free kilos so they can produce drugs
    await contract.connect(addr1).getFreeKilo();

    // Now try to call collectDrugs with addr1's own address as referral
    // This should revert because self-referral is not allowed
    await expect(
      contract.connect(addr1).collectDrugs(addr1.address)
    ).to.be.reverted;
  });
});