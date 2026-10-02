import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX4 - Kill mutant me5a1143f", function () {
  it("should fail when Command sends msg.value+1 but contract has exactly msg.value balance", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MultiplicatorX4");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    const contractAddress = await instance.getAddress();

    // Fund contract with exactly 1 ether
    await owner.sendTransaction({
      to: contractAddress,
      value: ethers.parseEther("1.0")
    });

    // Get recipient's initial balance
    const recipientInitialBalance = await ethers.provider.getBalance(addr2.address);

    // Call Command with 1 ether - mutant will try to send 1 ether + 1 wei
    const tx = await instance.connect(owner).Command(
      addr2.address,
      "0x",
      { value: ethers.parseEther("1.0") }
    );
    const receipt = await tx.wait();

    // Get recipient's final balance
    const recipientFinalBalance = await ethers.provider.getBalance(addr2.address);
    
    // Original would send 1 ether (recipient balance increases by 1 ether)
    // Mutant attempts to send 1 ether + 1 wei which fails silently, recipient gets nothing
    expect(recipientFinalBalance - recipientInitialBalance).to.equal(ethers.parseEther("0.0"));
  });
});