import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX3 mutant detection", function () {
  it("should kill mutant mc148463c by sending msg.value greater than contract balance", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MultiplicatorX3");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    const contractAddress = await instance.getAddress();

    // Fund contract with 1 ETH
    await owner.sendTransaction({
      to: contractAddress,
      value: ethers.parseEther("1.0")
    });

    // Get initial balances
    const initialContractBalance = await ethers.provider.getBalance(contractAddress);
    const initialAddr1Balance = await ethers.provider.getBalance(addr1.address);

    // Send 2 ETH to multiplicate (greater than contract balance of 1 ETH)
    const tx = await instance.connect(owner).multiplicate(addr1.address, {
      value: ethers.parseEther("2.0")
    });
    await tx.wait();

    // In original: contract sends (1+2)=3 ETH to addr1, contract balance becomes 0
    // In mutant: condition msg.value==balance fails (2!=1), no transfer occurs
    const finalContractBalance = await ethers.provider.getBalance(contractAddress);
    const finalAddr1Balance = await ethers.provider.getBalance(addr1.address);

    // Assert that the transfer happened (original behavior)
    expect(finalContractBalance).to.equal(0);
    expect(finalAddr1Balance).to.equal(
      initialAddr1Balance + ethers.parseEther("3.0")
    );
  });
});