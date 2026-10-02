import { expect } from "chai";
import { ethers } from "hardhat";

describe("Wallet mutant m0d8d3322 - deposit overflow with >= instead of >", function () {
  it("should revert on overflow with > but pass with >= in deposit assertion", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Wallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First deposit to set addr1's balance to type(uint256).max - 1
    const maxUint = ethers.MaxUint256;
    const firstDeposit = maxUint - 1n;
    await instance.connect(addr1).deposit({ value: firstDeposit });

    // Now deposit 1 wei to make balance exactly type(uint256).max
    await instance.connect(addr1).deposit({ value: 1n });

    // Deploy a new instance for the exact test
    const instance2 = await Factory.deploy();
    await instance2.waitForDeployment();

    // Set balance to type(uint256).max - 1
    await instance2.connect(addr1).deposit({ value: maxUint - 1n });
    // Add 1 to make it max
    await instance2.connect(addr1).deposit({ value: 1n });

    // Now deposit 0 when balance is already maxUint
    // Original: maxUint + 0 > maxUint => false => assert fails => revert
    // Mutant: maxUint + 0 >= maxUint => true => no revert (this is the bug)
    await expect(
      instance2.connect(addr1).deposit({ value: 0n })
    ).to.be.reverted;
  });
});