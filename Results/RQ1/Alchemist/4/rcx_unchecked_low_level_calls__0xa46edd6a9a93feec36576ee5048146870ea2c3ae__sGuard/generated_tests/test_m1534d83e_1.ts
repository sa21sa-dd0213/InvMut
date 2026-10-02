import { expect } from "chai";
import { ethers } } from "hardhat";

describe("EBU mutant test - m1534d83e", function () {
  it("should kill mutant by calling transfer with non-empty _tos array and expecting success", async function () {
    const [owner, from, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Prepare a non-empty _tos array and corresponding values
    const tos = [addr1.address];
    const values = [ethers.parseEther("1")];

    // Call transfer with non-empty array - original succeeds, mutant reverts
    const tx = await instance.transfer(from.address, ethers.ZeroAddress, tos, values);
    const receipt = await tx.wait();

    // If we get here without revert, original passes; if mutant reverts, test fails (kills mutant)
    expect(receipt.status).to.equal(1);
  });
});