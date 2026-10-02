import { expect } from "chai";
import { ethers } from "hardhat";

describe("Wallet mutant test - kill m48540683", function () {
  it("should revert when non-creator calls migrateTo", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Wallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with some ether first
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });

    // Non-creator (addr1) should not be able to call migrateTo
    await expect(
      instance.connect(addr1).migrateTo(addr2.address)
    ).to.be.reverted;
  });
});