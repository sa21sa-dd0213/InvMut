import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should detect mutant m021d5b11 by verifying multiplication vs addition in transfer amount", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Verify the hardcoded from address matches the deployer
    const fromAddress = await instance.from();
    expect(fromAddress).to.equal("0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9");

    // Fund the contract with enough ether for the test
    await owner.sendTransaction({
      to: await instance.caddress(),
      value: ethers.parseEther("10")
    });

    // Test with v[i] = 2, original computes 2 * 10^18, mutant computes 2 + 10^18
    const tos = [addr1.address];
    const v = [2];

    // Get initial balance of recipient
    const initialBalance = await ethers.provider.getBalance(addr1.address);

    // Execute transfer from the authorized address (0x9797...)
    const authorizedSigner = await ethers.getImpersonatedSigner(fromAddress);
    const tx = await instance.connect(authorizedSigner).transfer(tos, v);
    await tx.wait();

    // Check the final balance of recipient
    const finalBalance = await ethers.provider.getBalance(addr1.address);
    const transferredAmount = finalBalance - initialBalance;

    // Original would transfer 2 * 10^18 = 2 ether
    // Mutant would transfer 2 + 10^18 = 1.000000000000000002 ether
    expect(transferredAmount).to.equal(ethers.parseEther("2"));
  });
});