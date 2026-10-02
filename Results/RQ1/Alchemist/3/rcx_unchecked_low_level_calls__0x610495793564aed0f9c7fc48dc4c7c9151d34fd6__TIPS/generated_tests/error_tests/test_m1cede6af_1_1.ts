import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when sendMoney fails on original, but mutant allows silent failure", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy a simple contract that will revert on any call
    const ReverterFactory = await ethers.getContractFactory("contract Reverter { fallback() external payable { revert(); } }");
    const reverter = await ReverterFactory.deploy();
    await reverter.waitForDeployment();

    // Fund the wallet with some ether to make the call possible
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });

    // Attempt to send money to the reverter contract - this should revert in the original
    await expect(
      instance.connect(owner).sendMoney(
        await reverter.getAddress(),
        ethers.parseEther("0.5"),
        "0x"
      )
    ).to.be.reverted;
  });
});