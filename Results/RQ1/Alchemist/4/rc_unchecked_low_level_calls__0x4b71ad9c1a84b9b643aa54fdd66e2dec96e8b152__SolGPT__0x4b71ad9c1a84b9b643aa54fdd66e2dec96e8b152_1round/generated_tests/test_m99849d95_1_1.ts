import { expect } from "chai";
import { ethers } from "hardhat";

describe("airPort mutant kill test - m99849d95", function () {
  it("should return true from transfer function when all transfers succeed, but mutant returns false", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy the airPort contract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("airPort");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy a simple ERC20 token for testing transferFrom
    const TokenFactory = await ethers.getContractFactory("contracts/ERC20Mock.sol:ERC20Mock");
    const token = await TokenFactory.deploy("Test", "TST", 18);
    await token.waitForDeployment();

    // Mint tokens to owner and approve the airPort contract to spend them
    const mintAmount = ethers.parseEther("100");
    await token.mint(owner.address, mintAmount);
    await token.connect(owner).approve(await instance.getAddress(), mintAmount);

    // Create recipients array
    const recipients = [addr1.address, addr2.address];
    const transferAmount = ethers.parseEther("10");

    // Call transfer function and capture the return value
    const tx = await instance.transfer(
      owner.address,
      await token.getAddress(),
      recipients,
      transferAmount
    );
    await tx.wait();

    // The return value is encoded in the transaction response
    const result = await instance.transfer.staticCall(
      owner.address,
      await token.getAddress(),
      recipients,
      transferAmount
    );

    // Original returns true, mutant returns false
    expect(result).to.equal(true);
  });
});