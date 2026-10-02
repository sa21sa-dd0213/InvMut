import { expect } from "chai";
import { ethers } from "hardhat";

describe("airDrop mutant detection", function () {
  it("should detect mutant m5fe82436 by verifying correct value calculation", async function () {
    const [owner, from, to] = await ethers.getSigners();

    // Deploy a simple ERC20-like token to use with transferFrom
    const TokenFactory = await ethers.getContractFactory("TestToken");
    const token = await TokenFactory.deploy();
    await token.waitForDeployment();

    // Deploy the airDrop contract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("airDrop");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Setup: mint tokens to 'from' and approve the airDrop contract
    const mintAmount = ethers.parseEther("1000");
    await token.mint(from.address, mintAmount);
    await token.connect(from).approve(await instance.getAddress(), ethers.MaxUint256);

    // Test parameters: v=2, _decimals=1 => expected value = 2 * 10^1 = 20
    const v = 2;
    const _decimals = 1;
    const expectedValue = BigInt(v) * BigInt(10) ** BigInt(_decimals); // 20

    // Record balances before transfer
    const balanceBefore = await token.balanceOf(to.address);

    // Execute the airdrop
    const recipients = [to.address];
    const tx = await instance.connect(owner).transfer(
      from.address,
      await token.getAddress(),
      recipients,
      v,
      _decimals
    );
    await tx.wait();

    // Verify the correct amount was transferred
    const balanceAfter = await token.balanceOf(to.address);
    const actualTransferred = balanceAfter - balanceBefore;

    // Original: 2 * 10^1 = 20
    // Mutant: 2 ** 10^1 = 1024
    // This assertion will fail on the mutant
    expect(actualTransferred).to.equal(expectedValue);
  });
});