import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX4 - Kill mutant mf8fea3f3 (minus instead of plus)", function () {
  it("should send contract balance + msg.value, not minus", async function () {
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

    // Get initial balance of the recipient (addr1)
    const initialRecipientBalance = await ethers.provider.getBalance(addr1.address);

    // Call multiplicate with 5 ETH from owner
    const tx = await instance.connect(owner).multiplicate(addr1.address, {
      value: ethers.parseEther("5")
    });
    await tx.wait();

    // Expected: recipient should get 10 ETH (contract balance) + 5 ETH (msg.value) = 15 ETH
    const finalRecipientBalance = await ethers.provider.getBalance(addr1.address);
    const expectedIncrease = ethers.parseEther("15");
    expect(finalRecipientBalance - initialRecipientBalance).to.equal(expectedIncrease);
  });
});