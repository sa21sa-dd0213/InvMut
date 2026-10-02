import { expect } from "chai";
import { ethers } from "hardhat";

describe("airdrop reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should return true when transfer succeeds on original but false on mutant", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("airdrop");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy a simple ERC20 token for testing
    const TokenFactory = await ethers.getContractFactory("ERC20Mock");
    const token = await TokenFactory.deploy("Test", "TST", 18);
    await token.waitForDeployment();

    // Mint tokens to owner and approve airdrop contract to transfer
    const amount = ethers.parseEther("100");
    await token.mint(owner.address, amount);
    await token.connect(owner).approve(await instance.getAddress(), amount);

    // Create array of recipients
    const recipients = [addr1.address, addr2.address];
    const transferAmount = ethers.parseEther("10");

    // Call transfer function and capture return value
    const tx = await instance.transfer(
      owner.address,
      await token.getAddress(),
      recipients,
      transferAmount
    );
    const receipt = await tx.wait();

    // Get the return value from the transaction
    const result = await instance.callStatic.transfer(
      owner.address,
      await token.getAddress(),
      recipients,
      transferAmount
    );

    // The original returns true, the mutant returns false
    expect(result).to.equal(true);
  });
});