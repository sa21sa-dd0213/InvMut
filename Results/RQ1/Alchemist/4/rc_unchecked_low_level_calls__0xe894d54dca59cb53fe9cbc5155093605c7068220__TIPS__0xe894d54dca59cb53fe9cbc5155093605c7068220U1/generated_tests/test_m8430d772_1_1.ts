import { expect } from "chai";
import { ethers } from "hardhat";

describe("airDrop mutant m8430d772 - multiplication replaced with addition", function () {
  it("should kill mutant by verifying correct value calculation using multiplication", async function () {
    const [owner, from, to] = await ethers.getSigners();

    // Deploy the airDrop contract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("airDrop");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy a simple ERC20 token that implements transferFrom
    const TokenFactory = await ethers.getContractFactory("MockERC20");
    const token = await TokenFactory.deploy("Test", "TST", 18);
    await token.waitForDeployment();

    // Mint tokens to 'from' address and approve the airDrop contract
    const mintAmount = ethers.parseEther("1000");
    await token.mint(from.address, mintAmount);
    await token.connect(from).approve(await instance.getAddress(), mintAmount);

    // Set up parameters: v = 2, _decimals = 2 => expected value = 2 * 10^2 = 200
    const v = 2;
    const decimals = 2;
    const expectedValue = BigInt(v) * BigInt(10 ** decimals); // 200
    const recipients = [to.address];

    // Get initial balance of recipient
    const initialBalance = await token.balanceOf(to.address);

    // Call transfer function on the airDrop contract
    await instance.transfer(
      from.address,
      await token.getAddress(),
      recipients,
      v,
      decimals
    );

    // Check final balance - original would transfer 200, mutant would transfer 102
    const finalBalance = await token.balanceOf(to.address);
    const transferredAmount = finalBalance - initialBalance;

    // This assertion will fail on the mutant because it calculates v + 10**decimals = 102
    // instead of v * 10**decimals = 200
    expect(transferredAmount).to.equal(expectedValue);
  });
});