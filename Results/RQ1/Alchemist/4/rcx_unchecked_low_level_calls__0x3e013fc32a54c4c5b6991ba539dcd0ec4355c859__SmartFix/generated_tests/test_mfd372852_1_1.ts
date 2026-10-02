import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX4 - Kill mutant mfd372852 (>= replaced with ==)", function () {
  it("should transfer entire balance when msg.value is greater than contract balance", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy contract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("MultiplicatorX4");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with 2 ETH from owner
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("2.0")
    });

    // Get initial balances
    const initialContractBalance = await ethers.provider.getBalance(await instance.getAddress());
    const initialRecipientBalance = await ethers.provider.getBalance(addr2.address);

    // Send 3 ETH (greater than contract's 2 ETH balance) to multiplicate
    const tx = await instance.connect(owner).multiplicate(addr2.address, {
      value: ethers.parseEther("3.0")
    });
    await tx.wait();

    // After transaction, contract balance should be 0 (all funds sent to recipient)
    const finalContractBalance = await ethers.provider.getBalance(await instance.getAddress());
    expect(finalContractBalance).to.equal(0n);

    // Recipient should have received initial balance + 5 ETH (2 contract balance + 3 sent)
    const finalRecipientBalance = await ethers.provider.getBalance(addr2.address);
    expect(finalRecipientBalance).to.equal(initialRecipientBalance + ethers.parseEther("5.0"));
  });
});