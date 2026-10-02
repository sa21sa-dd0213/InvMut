import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet mutant detection - sendMoney failure revert check", function () {
  it("should revert when sendMoney call fails, detecting mutant that replaces !_s with false", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy a simple receiver contract that will revert on receive
    const RevertingReceiver = await ethers.getContractFactory(
      "contracts/RevertingReceiver.sol:RevertingReceiver"
    );
    const receiver = await RevertingReceiver.deploy();
    await receiver.waitForDeployment();

    // Fund the SimpleWallet with some ether
    const fundAmount = ethers.parseEther("1.0");
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: fundAmount,
    });

    // Attempt to send money to the reverting receiver
    // The original contract should revert, the mutant should not
    const targetAddress = await receiver.getAddress();
    const sendValue = ethers.parseEther("0.5");
    const emptyData = "0x";

    // This should revert on the original contract
    await expect(
      instance.connect(owner).sendMoney(targetAddress, sendValue, emptyData)
    ).to.be.reverted;

    // Verify that the balance remains unchanged (mutant would have transferred)
    const balanceAfter = await ethers.provider.getBalance(
      await instance.getAddress()
    );
    expect(balanceAfter).to.equal(fundAmount);
  });
});