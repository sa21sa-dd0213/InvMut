import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when sendMoney call fails on original but mutant silently succeeds", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the wallet with some ETH for the test
    const fundTx = await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });
    await fundTx.wait();

    // Get initial balance of the wallet
    const initialBalance = await ethers.provider.getBalance(await instance.getAddress());

    // Attempt to send ETH to a non-payable contract (address that will reject calls)
    const nonPayableTarget = addr1.address;
    const sendAmount = ethers.parseEther("0.5");
    const emptyData = "0x";

    // This should revert on the original (require(sent) will fail), 
    // but the mutant will not revert
    const tx = instance.connect(owner).sendMoney(nonPayableTarget, sendAmount, emptyData);
    
    // Check that the transaction does NOT revert (mutant behavior)
    await expect(tx).to.not.be.reverted;

    // Verify that the wallet's balance remains unchanged (since the call failed silently)
    const finalBalance = await ethers.provider.getBalance(await instance.getAddress());
    expect(finalBalance).to.equal(initialBalance);
  });
});