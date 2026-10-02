import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant m021d5b11 detection", function () {
  it("should detect multiplication replaced by addition in transfer function", async function () {
    // Deploy the contract (no constructor arguments for EBU)
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const [owner] = await ethers.getSigners();
    const contractAddress = await instance.getAddress();

    // The contract's hardcoded from address
    const fromAddress = "0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9";

    // The contract's hardcoded caddress (a token contract we'll simulate)
    const caddress = "0x1f844685f7Bf86eFcc0e74D8642c54A257111923";

    // We need to impersonate the from address to call transfer
    await hre.network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [fromAddress],
    });
    const signer = await ethers.getSigner(fromAddress);

    // Fund the impersonated account with some ETH for gas
    await owner.sendTransaction({
      to: fromAddress,
      value: ethers.parseEther("1.0"),
    });

    // Create a simple token contract at caddress to observe the call
    // We'll deploy a minimal ERC20-like contract that logs the transfer amount
    const minimalTokenFactory = await ethers.getContractFactory(
      "MinimalToken"
    );
    const token = await minimalTokenFactory.deploy();
    await token.waitForDeployment();

    // Set the token contract at caddress by deploying there
    // Since we can't change caddress, we'll deploy the token at that exact address
    // First we need to set the code at caddress
    const tokenBytecode = await ethers.provider.getCode(
      await token.getAddress()
    );
    await hre.network.provider.request({
      method: "hardhat_setCode",
      params: [caddress, tokenBytecode],
    });

    // Get the token contract instance at caddress
    const tokenAtCaddress = await ethers.getContractAt(
      "MinimalToken",
      caddress,
      signer
    );

    // Prepare test parameters: 1 token with value 1 (in smallest unit)
    const amount = 1;
    const recipient = "0x0000000000000000000000000000000000000001";

    // Call transfer from the authorized address
    const tx = await signer.sendTransaction({
      to: contractAddress,
      data: instance.interface.encodeFunctionData("transfer", [
        [recipient],
        [amount],
      ]),
    });
    await tx.wait();

    // In the original contract, the amount passed would be amount * 10^18 = 1 * 10^18 = 10^18
    // In the mutant, the amount passed would be amount + 10^18 = 1 + 10^18 = 10^18 + 1
    // We can detect this by checking the token contract's storage or emitted events
    // For this test, we'll check if the balance of recipient matches original expected value
    const expectedOriginal = ethers.parseEther("1"); // 1 * 10^18
    const balance = await tokenAtCaddress.balanceOf(recipient);

    // If mutant is present, balance will be different (amount + 10^18 instead of amount * 10^18)
    // The original would give balance = 10^18, mutant would give 10^18 + 1
    expect(balance).to.equal(expectedOriginal);
  });
});