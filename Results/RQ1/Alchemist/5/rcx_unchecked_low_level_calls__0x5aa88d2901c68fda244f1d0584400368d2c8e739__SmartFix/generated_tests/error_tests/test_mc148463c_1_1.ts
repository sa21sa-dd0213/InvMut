import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX3 - kill mutant mc148463c", function () {
  it("should succeed when msg.value > contract balance, killing the mutant that uses == instead of >=", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MultiplicatorX3");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    const contractAddress = await instance.getAddress();

    // Seed the contract with some initial balance
    await owner.sendTransaction({
      to: contractAddress,
      value: ethers.parseEther("5.0"),
    });

    // Get initial balances
    const initialContractBalance = await ethers.provider.getBalance(contractAddress);
    const initialRecipientBalance = await ethers.provider.getBalance(addr1.address);

    // Send a value greater than the current contract balance (e.g., 10 ETH when balance is 5 ETH)
    const tx = await instance.connect(owner).multiplicate(addr1.address, {
      value: ethers.parseEther("10.0"),
    });
    await tx.wait();

    // Check that funds were transferred (original behavior: should succeed)
    const finalRecipientBalance = await ethers.provider.getBalance(addr1.address);
    const expectedTransfer = ethers.parseEther("15.0"); // 5 (initial contract balance) + 10 (msg.value)
    expect(finalRecipientBalance - initialRecipientBalance).to.equal(expectedTransfer);
  });
});