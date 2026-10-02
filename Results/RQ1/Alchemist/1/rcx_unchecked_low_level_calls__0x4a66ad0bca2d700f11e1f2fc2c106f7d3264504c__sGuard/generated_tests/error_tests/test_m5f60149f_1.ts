import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant detection test", function () {
  it("should detect mutant m5f60149f by checking caddress balance after transfer", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Get the caddress from the contract
    const caddress = await instance.caddress();
    const fromAddress = await instance.from();

    // Get initial balance of caddress (assume it has some tokens or use a mock token)
    // For this test, we assume caddress holds tokens; we'll check its balance change
    const initialBalance = await ethers.provider.getBalance(caddress);

    // Prepare transfer parameters - send to addr1 with value 1 token (1 ETH)
    const tos = [addr1.address];
    const values = [1]; // 1 token unit

    // Execute transfer as the authorized sender (original from address)
    await instance.connect(owner).transfer(tos, values);

    // Get final balance of caddress
    const finalBalance = await ethers.provider.getBalance(caddress);

    // In the original contract, caddress balance should remain unchanged
    // In the mutant, caddress is used as 'from' in transferFrom, so its balance decreases
    // We expect the balance to be different (mutant detected)
    expect(finalBalance).to.be.lessThan(initialBalance);
  });
});