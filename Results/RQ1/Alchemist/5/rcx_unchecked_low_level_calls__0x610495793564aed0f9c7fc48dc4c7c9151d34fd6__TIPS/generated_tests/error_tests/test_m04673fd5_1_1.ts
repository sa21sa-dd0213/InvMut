import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert sendMoney when external call succeeds due to mutant always reverting", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the wallet with some ether for the sendMoney call
    const fundTx = await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });
    await fundTx.wait();

    // Create a simple target contract that can receive ETH
    const targetFactory = await ethers.getContractFactory("SimpleWallet");
    const target = await targetFactory.deploy();
    await target.waitForDeployment();

    // Prepare empty data for a simple ETH transfer
    const emptyData = "0x";

    // Attempt sendMoney which should succeed on original but revert on mutant
    await expect(
      instance.connect(owner).sendMoney(
        await target.getAddress(),
        ethers.parseEther("0.5"),
        emptyData
      )
    ).to.be.reverted;
  });
});