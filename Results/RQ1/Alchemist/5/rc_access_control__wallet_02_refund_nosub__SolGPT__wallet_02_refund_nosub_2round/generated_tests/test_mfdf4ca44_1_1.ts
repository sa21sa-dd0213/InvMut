import { expect } from "chai";
import { ethers } from "hardhat";

describe("Wallet mutant mfdf4ca44 test", function () {
  it("should revert when creator calls migrateTo (mutant uses != instead of ==)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Wallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with some ETH so migrateTo has balance to transfer
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });

    // Creator (owner) calls migrateTo - should succeed in original but fail in mutant
    await expect(
      instance.connect(owner).migrateTo(addr1.address)
    ).to.be.reverted;
  });
});