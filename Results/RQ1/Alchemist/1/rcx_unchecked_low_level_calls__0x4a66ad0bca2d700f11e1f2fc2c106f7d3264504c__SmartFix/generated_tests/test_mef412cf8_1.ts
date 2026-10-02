import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant mef412cf8 - return true removal", function () {
  it("should return true on successful transfer call from authorized address", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // The authorized address is hardcoded in the contract as 0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9
    // We need to impersonate that address using hardhat_setBalance and hardhat_impersonateAccount
    const authorizedAddress = "0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9";
    
    // Set balance for the authorized address so it can send transactions
    await ethers.provider.send("hardhat_setBalance", [
      authorizedAddress,
      "0x1000000000000000000" // 1 ETH in hex
    ]);

    // Impersonate the authorized address
    await ethers.provider.send("hardhat_impersonateAccount", [authorizedAddress]);
    const authorizedSigner = await ethers.getSigner(authorizedAddress);

    // Prepare valid parameters: non-empty arrays with valid v values
    // v[i] must be non-zero or satisfy (v[i] * 10^18) / v[i] == 10^18
    // Using v[i] = 1 is safe (1 * 10^18 / 1 == 10^18)
    const tos = [addr1.address];
    const v = [1];

    // Call transfer from the authorized address
    const tx = await instance.connect(authorizedSigner).transfer(tos, v);
    const receipt = await tx.wait();

    // The function should return true on success in the original contract
    // The mutant removes return true, so it returns false by default
    // We need to decode the return value from the transaction
    const iface = new ethers.Interface([
      "function transfer(address[] memory _tos, uint[] memory v) public returns (bool)"
    ]);
    const decodedData = iface.decodeFunctionResult("transfer", receipt.logs[0]?.data || "0x");
    
    // If there's no explicit return, the return data will be empty or false
    // We check that the return value is explicitly true
    expect(decodedData[0]).to.equal(true);
  });
});