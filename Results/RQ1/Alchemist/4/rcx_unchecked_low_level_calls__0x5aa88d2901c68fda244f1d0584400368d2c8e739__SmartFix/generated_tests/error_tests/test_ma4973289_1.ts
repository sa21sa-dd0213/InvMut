import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX3 mutant detection - ma4973289", function () {
  it("should detect the mutant by verifying that Command sends exactly msg.value, not msg.value+1", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MultiplicatorX3");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with some initial balance so the call can succeed
    const fundTx = await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });
    await fundTx.wait();

    // Get initial balance of target address
    const initialBalance = await ethers.provider.getBalance(addr1.address);
    
    // Call Command with 1 ether
    const txValue = ethers.parseEther("1");
    const data = "0x";
    const tx = await instance.connect(owner).Command(addr1.address, data, { value: txValue });
    await tx.wait();

    // Check final balance of target address
    const finalBalance = await ethers.provider.getBalance(addr1.address);
    const difference = finalBalance - initialBalance;
    
    // In original, difference should be exactly msg.value (1 ether)
    // In mutant, the call tries to send msg.value+1 (more than available in contract after msg.value is added),
    // which will cause the call to fail and revert the transaction, so the balance should remain unchanged
    expect(difference).to.equal(txValue);
  });
});