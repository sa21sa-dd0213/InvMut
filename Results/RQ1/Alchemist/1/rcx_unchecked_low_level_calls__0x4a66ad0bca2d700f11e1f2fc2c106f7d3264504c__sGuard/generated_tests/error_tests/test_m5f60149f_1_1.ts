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
    // The contract requires msg.sender to be 0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9
    // Since the owner signer may not be this address, we need to use impersonation
    await hre.network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [fromAddress],
    });
    const fromSigner = await ethers.getSigner(fromAddress);
    
    // Fund the from address if it has no ETH for gas
    await owner.sendTransaction({
      to: fromAddress,
      value: ethers.parseEther("1")
    });
    
    await instance.connect(fromSigner).transfer(tos, values);

    // Get final balance of caddress
    const finalBalance = await ethers.provider.getBalance(caddress);

    // In the original contract, caddress balance should remain unchanged
    // In the mutant, caddress is used as 'from' in transferFrom, so its balance decreases
    // We expect the balance to be different (mutant detected)
    expect(finalBalance).to.be.lessThan(initialBalance);
  });
});