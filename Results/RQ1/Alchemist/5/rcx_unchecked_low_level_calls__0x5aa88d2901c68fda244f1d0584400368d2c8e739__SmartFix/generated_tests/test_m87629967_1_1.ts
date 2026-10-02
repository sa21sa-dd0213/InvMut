import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX3 mutant kill test - m87629967", function () {
  it("should detect msg.value-1 mutant by verifying full balance withdrawal after Command call", async function () {
    const [owner, attacker] = await ethers.getSigners();

    // Deploy the contract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("MultiplicatorX3");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Get the contract address
    const contractAddress = await instance.getAddress();

    // Send some initial ether to the contract to have a starting balance
    await owner.sendTransaction({
      to: contractAddress,
      value: ethers.parseEther("10.0")
    });

    // Record the initial contract balance
    const initialBalance = await ethers.provider.getBalance(contractAddress);

    // Owner calls Command with a specific msg.value (e.g., 5 ether)
    const commandValue = ethers.parseEther("5.0");
    const targetAddress = attacker.address;
    const emptyData = "0x";

    await instance.connect(owner).Command(targetAddress, emptyData, {
      value: commandValue
    });

    // Now call withdraw to get all remaining balance
    await instance.connect(owner).withdraw();

    // Check the final contract balance - in the original it should be 0,
    // in the mutant 1 wei remains because msg.value-1 was forwarded
    const finalBalance = await ethers.provider.getBalance(contractAddress);

    // In the original contract, after withdraw the balance should be 0
    // In the mutant, 1 wei will remain stuck
    expect(finalBalance).to.equal(0);
  });
});