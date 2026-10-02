import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant test - m2ed3a55a", function () {
  it("should succeed with non-empty _tos array on original but fail on mutant with require(_tos.length < 0)", async function () {
    const [owner, from, to] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Prepare a valid token address (using a simple deployed token or a mock)
    // For this test, we deploy a minimal ERC20-like contract that has transferFrom
    const TokenFactory = await ethers.getContractFactory("ERC20");
    const token = await TokenFactory.deploy("Test", "TST", ethers.parseEther("1000"));
    await token.waitForDeployment();

    // Give from address some tokens and approve the EBU contract
    await token.transfer(from.address, ethers.parseEther("100"));
    await token.connect(from).approve(await instance.getAddress(), ethers.parseEther("100"));

    // Prepare test data: one recipient with a valid amount
    const recipients = [to.address];
    const amounts = [ethers.parseEther("10")];

    // Call transfer - should succeed on original (require(_tos.length > 0))
    // On mutant (require(_tos.length < 0)) it will revert because length 1 is not < 0
    const tx = instance.connect(owner).transfer(
      from.address,
      await token.getAddress(),
      recipients,
      amounts
    );

    // Expect the transaction to revert on the mutant
    await expect(tx).to.be.reverted;
  });
});