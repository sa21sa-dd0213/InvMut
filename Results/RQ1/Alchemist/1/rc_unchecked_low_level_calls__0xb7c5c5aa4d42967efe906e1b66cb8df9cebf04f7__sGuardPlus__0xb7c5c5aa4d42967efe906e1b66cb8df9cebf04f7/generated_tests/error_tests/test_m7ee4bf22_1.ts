import { expect } from "chai";
import { ethers } } from "hardhat";

describe("keepMyEther mutant m7ee4bf22 test", function () {
  it("should detect mutant that subtracts 1 wei from msg.value in fallback", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("keepMyEther");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const depositAmount = ethers.parseEther("1.0");
    
    // Send ether via fallback
    const tx = await addr1.sendTransaction({
      to: await instance.getAddress(),
      value: depositAmount
    });
    await tx.wait();

    // Withdraw all balance
    const withdrawTx = await instance.connect(addr1).withdraw();
    await withdrawTx.wait();

    // Check that addr1 received exactly the deposited amount back
    const balanceAfter = await ethers.provider.getBalance(addr1.address);
    // The balance should be the original balance (pre-deposit) + depositAmount - gas costs
    // We use a simpler check: the contract balance should be 0
    const contractBalance = await ethers.provider.getBalance(await instance.getAddress());
    expect(contractBalance).to.equal(0);
  });
});