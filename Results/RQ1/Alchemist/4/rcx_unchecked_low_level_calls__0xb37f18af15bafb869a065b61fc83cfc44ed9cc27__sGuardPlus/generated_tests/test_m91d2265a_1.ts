import { expect } from "chai";
import { ethers } } from "hardhat";

describe("SimpleWallet mutant m91d2265a test", function () {
  it("should revert when sendMoney is called with a target that reverts, but mutant silently succeeds", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy a simple contract that reverts on receive
    const RevertingContract = await ethers.getContractFactory("contract RevertingTarget { receive() external payable { revert('always revert'); } }");
    const revertingTarget = await RevertingContract.deploy();
    await revertingTarget.waitForDeployment();

    const sendAmount = ethers.parseEther("1");
    // Fund the wallet first
    await owner.sendTransaction({ to: await instance.getAddress(), value: sendAmount });

    // On the original contract, this call would revert due to require(__sent_result100)
    // On the mutant, it will succeed despite the failed transfer
    const tx = instance.connect(owner).sendMoney(await revertingTarget.getAddress(), sendAmount);
    
    // For the mutant, the transaction does NOT revert, so we expect it to succeed
    // This test will pass on the original (revert) but fail on the mutant (no revert)
    await expect(tx).to.be.reverted;  // Will kill the mutant because mutant doesn't revert
  });
});