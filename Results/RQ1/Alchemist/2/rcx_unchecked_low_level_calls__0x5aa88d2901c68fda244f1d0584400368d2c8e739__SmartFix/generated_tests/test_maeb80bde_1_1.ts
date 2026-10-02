import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX3 - Kill mutant maeb80bde", function () {
  it("should revert when calling multiplicate with non-zero msg.value that is >= contract balance (mutant changes + to -)", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy the contract (no constructor arguments needed for MultiplicatorX3)
    const Factory = await ethers.getContractFactory("MultiplicatorX3");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First, send some ether to the contract to have a balance
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });

    // Now call multiplicate with msg.value >= contract balance
    // Contract balance is 1 ETH, so we send 1 ETH or more
    const contractBalance = await ethers.provider.getBalance(await instance.getAddress());
    const sendAmount = contractBalance; // exactly equal to balance

    // On the original, this would succeed (the require passes)
    // On the mutant, the require(address(this).balance - msg.value >= address(this).balance)
    // will revert because subtracting positive msg.value makes it less than balance
    await expect(
      instance.connect(addr1).multiplicate(addr1.address, { value: sendAmount })
    ).to.be.reverted;
  });
});