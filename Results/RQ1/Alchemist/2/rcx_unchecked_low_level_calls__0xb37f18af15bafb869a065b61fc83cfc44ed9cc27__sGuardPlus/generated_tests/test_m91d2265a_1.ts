import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet mutant test - sendMoney without require", function () {
  it("should revert when sendMoney fails on original, but mutant should silently proceed", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the wallet with some ether
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });

    // Deploy a simple contract that rejects incoming ether
    const Rejector = await ethers.getContractFactory("contract Rejector { receive() external payable { revert(); } }");
    const rejector = await Rejector.deploy();
    await rejector.waitForDeployment();

    // Try to send ether to the rejector - should revert on original
    await expect(
      instance.connect(owner).sendMoney(await rejector.getAddress(), ethers.parseEther("0.5"))
    ).to.be.reverted;

    // Now check the wallet balance - on original it should remain unchanged
    const balanceAfter = await ethers.provider.getBalance(await instance.getAddress());
    expect(balanceAfter).to.equal(ethers.parseEther("1.0"));
  });
});