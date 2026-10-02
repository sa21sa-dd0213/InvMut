import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX4 mutant kill test", function () {
  it("should kill mutant md9b125e9 by calling multiplicate with value less than contract balance", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MultiplicatorX4");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with 10 ETH
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });

    // Get initial contract balance
    const initialBalance = await ethers.provider.getBalance(await instance.getAddress());

    // Call multiplicate with 1 ETH (less than contract balance of 10 ETH)
    const tx = await instance.connect(owner).multiplicate(addr1.address, { value: ethers.parseEther("1") });
    
    // In original contract, this should NOT transfer (condition fails)
    // In mutant, condition is always true, so transfer happens and contract balance drops
    await expect(tx).to.changeEtherBalance(
      instance,
      0 // Original: no change; Mutant: would lose balance
    );
  });
});