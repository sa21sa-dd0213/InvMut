import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX3 mutant kill test", function () {
  it("should kill mutant m38cb7c4e by detecting arithmetic operation change in multiplicate", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MultiplicatorX3");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with 10 ether first
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });

    // Get initial contract balance
    const initialBalance = await ethers.provider.getBalance(await instance.getAddress());
        
    // Send exactly 1 wei to multiplicate - this is the critical test value
    // Original: require(balance + msg.value >= balance) passes with any msg.value
    // Mutant: require(balance * msg.value >= balance) only passes when msg.value >= 1
    // The key difference is that with balance > 0 and msg.value = 1 wei:
    // Original passes the require and sends balance + 1 wei to addr1
    // Mutant passes the require (balance * 1 >= balance) but then tries to send balance + 1 wei
    // This will fail because the contract only has balance, not balance + 1 wei
    // The transfer will revert due to insufficient balance
        
    await expect(
      instance.connect(owner).multiplicate(addr1.address, { value: 1 })
    ).to.be.reverted;
  });
});