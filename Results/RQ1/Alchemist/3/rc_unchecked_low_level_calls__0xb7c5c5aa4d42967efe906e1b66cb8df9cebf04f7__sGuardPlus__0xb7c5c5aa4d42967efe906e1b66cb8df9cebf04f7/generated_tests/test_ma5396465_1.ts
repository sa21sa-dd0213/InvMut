import { expect } from "chai";
import { ethers } } from "hardhat";

describe("keepMyEther mutant kill test", function () {
  it("should detect the fallback mutation that adds 1 wei extra", async function () {
    const [owner, user] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("keepMyEther");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const sendAmount = ethers.parseEther("1");
    
    // User sends exactly 1 ETH via fallback
    await user.sendTransaction({
      to: await instance.getAddress(),
      value: sendAmount
    });

    // Check balance recorded in contract
    const recordedBalance = await instance.balances(user.address);
    
    // In original: recordedBalance === sendAmount
    // In mutant: recordedBalance === sendAmount + 1 wei
    // The contract only actually received sendAmount, so withdraw will fail
    await expect(
      instance.connect(user).withdraw()
    ).to.be.reverted;

    // Additionally verify the balance wasn't set correctly
    // (mutant sets it to sendAmount + 1 wei instead of sendAmount)
    expect(recordedBalance).to.equal(sendAmount);
  });
});