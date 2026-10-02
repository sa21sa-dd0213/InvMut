import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant m37952cbd test", function () {
  it("should revert when external call fails on original, but succeed on mutant", async function () {
    const [owner, attacker] = await ethers.getSigners();

    // Deploy the EBU contract (no constructor arguments)
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Get the contract addresses from the deployed instance
    const fromAddress = await instance.from();
    const caddress = await instance.caddress();

    // We need to make the external call fail. Since caddress is a fixed address,
    // we can use an invalid recipient or amount that causes transferFrom to fail.
    // We'll use a very large value that the token contract will reject, or use
    // a recipient that doesn't accept transfers.
    // For this test, we'll use a zero address as recipient which should fail.
    const tos = ["0x0000000000000000000000000000000000000000"];
    const values = [1]; // 1 token unit

    // Attempt to call transfer as the authorized sender (owner)
    // The test should expect a revert on the original, but not on the mutant
    await expect(
      instance.connect(owner).transfer(tos, values)
    ).to.be.reverted;
  });
});