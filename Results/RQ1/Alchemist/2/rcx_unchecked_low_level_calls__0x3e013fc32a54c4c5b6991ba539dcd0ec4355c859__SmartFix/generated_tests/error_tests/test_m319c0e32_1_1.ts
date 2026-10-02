import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX4 mutant test", function () {
  it("should detect mutant m319c0e32 by sending msg.value equal to contract balance", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MultiplicatorX4");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    const instanceAddress = await instance.getAddress();

    // Fund the contract with 10 ETH
    await owner.sendTransaction({
      to: instanceAddress,
      value: ethers.parseEther("10")
    });

    // Get initial balances
    const initialContractBalance = await ethers.provider.getBalance(instanceAddress);
    const initialRecipientBalance = await ethers.provider.getBalance(addr2.address);

    // Call multiplicate with msg.value equal to contract balance (10 ETH)
    const tx = instance.connect(owner).multiplicate(addr2.address, {
      value: initialContractBalance
    });

    // The mutant will try to transfer balance + msg.value + 1 = 21 ETH, but only 20 ETH exists -> revert
    await expect(tx).to.be.reverted;
  });
});