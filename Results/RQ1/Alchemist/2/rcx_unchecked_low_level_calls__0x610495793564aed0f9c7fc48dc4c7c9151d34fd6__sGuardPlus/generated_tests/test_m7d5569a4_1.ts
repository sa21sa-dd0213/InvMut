import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when sendMoney is called with a failing target address (kills mutant that removes require on call success)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy a simple contract that always reverts when receiving ether
    const RevertingReceiver = await ethers.getContractFactory("contract RevertingReceiver { receive() external payable { revert(); } }");
    const revertingReceiver = await RevertingReceiver.deploy();
    await revertingReceiver.waitForDeployment();

    const sendValue = ethers.parseEther("1.0");
    const targetAddress = await revertingReceiver.getAddress();

    // Fund the wallet so it has balance to send
    await owner.sendTransaction({ to: await instance.getAddress(), value: sendValue });

    // This call should revert because the target reverts
    await expect(
      instance.connect(owner).sendMoney(targetAddress, sendValue, "0x")
    ).to.be.reverted;
  });
});